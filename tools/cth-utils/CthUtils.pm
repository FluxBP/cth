# -----------------------------------------------------------------------
# CthUtils
#
# Miscellaneous utility functions and repetitive patterns/tasks used in
# the implementation of cth test drivers.
# -----------------------------------------------------------------------

package CthUtils;

use strict;
use warnings;

use Exporter qw(import);
our @EXPORT = qw(
    absolute
    chdir_for_sure
);

use File::Spec::Functions qw(rel2abs);
use Cwd qw(abs_path getcwd);
use File::Path qw(make_path);
use File::Basename;

# -----------------------------------------------------------------------
# absolute: solve all our problems w.r.t. finding absolute paths and
#   ensuring they are created, exist, etc.
# -----------------------------------------------------------------------

use constant {
    ABSOLUTE_MAY_NOT_EXIST => 1,
    ABSOLUTE_MUST_EXIST    => 2, # it seems abs_path still works if entire path exists except last component (not sure)
    ABSOLUTE_ENSURE_CREATE => 3,
    ABSOLUTE_MUST_RECREATE => 4,
};

sub absolute {
    my $indir = shift;
    if (! defined $indir) {
        print "ERROR: absolute: undefined indir\n";
        exit 1;
    }
    my $mode = shift;
    if (! defined $mode) {
        print "ERROR: absolute: undefined mode\n";
        exit 1;
    }
    $indir = rel2abs($indir);
    my $dir;
    if ($mode == CthUtils::ABSOLUTE_MAY_NOT_EXIST) {
        if (-d $indir) {
            $dir = abs_path($indir);
        } else {
            # try to remove the '..'s
            if ($indir =~ /^\//) { # skip if it doesn't start with '/' for some reason
                my @components = split /\//, $indir;
                my @resolved_path;
                foreach my $component (@components) {
                    if ($component eq "..") {
                        if (! @resolved_path) {
                            $dir = $indir; # indir is a malformed/invalid path string; skip doing anything to it
                            last;
                        }
                        pop @resolved_path;
                    } elsif ($component ne ".") {
                        push @resolved_path, $component;
                    }
                }
                if (! defined $dir) {
                    $dir = "/" . join("/", @resolved_path);
                }
            }
        }
    } elsif ($mode == CthUtils::ABSOLUTE_MUST_EXIST) {
        $dir = abs_path($indir);
    } elsif ($mode == CthUtils::ABSOLUTE_ENSURE_CREATE || $mode == CthUtils::ABSOLUTE_MUST_RECREATE) {
        if ($mode == CthUtils::ABSOLUTE_MUST_RECREATE) {
            system("rm -rf $indir");
        }
        if (! -d $indir) {
            system("mkdir -p $indir");
            if ($? != 0 && $? != 17) { # neither success nor error "already exists"
                print "ERROR: absolute: failed to create path for '$indir': $! ($?)";
                exit 1;
            }
        }
        $dir = abs_path($indir); # now that it exists, use abs_path to clean it up
    } else {
        print "ERROR: absolute: invalid mode: $mode\n";
        exit 1;
    }
    if (! defined $dir) {
        print "ERROR: absolute: abs_path failed.\n";
        exit 1;
    }
    return $dir;
}

# -----------------------------------------------------------------------
# chdir_for_sure: chdir with if and prints
# -----------------------------------------------------------------------

sub chdir_for_sure {
    my $dir = shift;
    if (! defined $dir) {
        print "ERROR: chdir_for_sure: undefined dir\n";
        exit 1;
    }
    if (chdir($dir)) {
        print "Changed to directory: " . getcwd() . "\n";
    } else {
        print "ERROR: chdir_for_sure: failed to chdir('$dir'): $!\n";
        exit 1;
    }
}

# -----------------------------------------------------------------------
# End of library.
# -----------------------------------------------------------------------

1;
